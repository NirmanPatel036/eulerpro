import {
    Question,
    Difficulty,
    DIFFICULTY_MULTIPLIER,
    QuestionResult,
    ExamResult,
    ExamSession,
    Exam,
} from '@/lib/types';

/**
 * Smart Scoring Engine
 * Formula: Final Score = Σ[Question Points × Difficulty Multiplier × Correctness Factor]
 *
 * Correctness Factors:
 *   Perfect match:  1.0
 *   Partial credit: 0.5
 *   Wrong + neg:   -0.25
 *   Unanswered:     0
 */

function getCorrectnessAndPartial(
    question: Question,
    answer: unknown
): { correctness: number; isCorrect: boolean; isPartial: boolean } {
    if (answer === null || answer === undefined) {
        return { correctness: 0, isCorrect: false, isPartial: false };
    }

    switch (question.type) {
        case 'multiple_choice': {
            const isCorrect = answer === question.correct_option;
            return {
                correctness: isCorrect ? 1.0 : question.negative_marking ? -0.25 : 0,
                isCorrect,
                isPartial: false,
            };
        }

        case 'true_false': {
            const isCorrect = answer === question.correct_answer;
            return {
                correctness: isCorrect ? 1.0 : question.negative_marking ? -0.25 : 0,
                isCorrect,
                isPartial: false,
            };
        }

        case 'checkbox': {
            const studentAnswers = Array.isArray(answer) ? (answer as number[]) : [];
            const correct = new Set(question.correct_options);
            const student = new Set(studentAnswers);
            const allCorrect =
                correct.size === student.size &&
                [...correct].every((c) => student.has(c));
            if (allCorrect) return { correctness: 1.0, isCorrect: true, isPartial: false };

            // Partial: some correct, none wrong
            const correctCount = [...student].filter((s) => correct.has(s)).length;
            const wrongCount = [...student].filter((s) => !correct.has(s)).length;

            if (question.partial_credit && correctCount > 0 && wrongCount === 0) {
                return { correctness: 0.5, isCorrect: false, isPartial: true };
            }
            return {
                correctness: question.negative_marking ? -0.25 : 0,
                isCorrect: false,
                isPartial: false,
            };
        }

        case 'fill_blank': {
            const studentText = String(answer).trim();
            const regex = new RegExp(question.answer_regex, 'i');
            const isCorrect = regex.test(studentText);
            return {
                correctness: isCorrect ? 1.0 : question.negative_marking ? -0.25 : 0,
                isCorrect,
                isPartial: false,
            };
        }

        case 'matching': {
            const studentPairs = answer as Record<number, number>;
            const totalPairs = question.pairs.length;
            const correctPairs = question.pairs.filter((_, i) => studentPairs[i] === i).length;

            if (correctPairs === totalPairs) return { correctness: 1.0, isCorrect: true, isPartial: false };
            if (question.partial_credit && correctPairs > 0) {
                return { correctness: 0.5, isCorrect: false, isPartial: true };
            }
            return {
                correctness: question.negative_marking ? -0.25 : 0,
                isCorrect: false,
                isPartial: false,
            };
        }

        case 'reorder': {
            const studentOrder = answer as number[];
            const isCorrect =
                JSON.stringify(studentOrder) === JSON.stringify(question.correct_order);
            return {
                correctness: isCorrect ? 1.0 : question.negative_marking ? -0.25 : 0,
                isCorrect,
                isPartial: false,
            };
        }

        default:
            return { correctness: 0, isCorrect: false, isPartial: false };
    }
}

export function scoreExam(
    exam: Exam,
    session: ExamSession
): ExamResult {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const questionResults: QuestionResult[] = [];

    for (const question of exam.questions) {
        const diffMultiplier = DIFFICULTY_MULTIPLIER[question.difficulty as Difficulty];
        const maxPoints = question.points * diffMultiplier;
        maxPossibleScore += maxPoints;

        const studentAnswer = (session.answers as Record<string, unknown>)[question.id];
        const { correctness, isCorrect, isPartial } = getCorrectnessAndPartial(
            question,
            studentAnswer
        );

        const pointsEarned = question.points * diffMultiplier * correctness;
        totalScore += pointsEarned;

        questionResults.push({
            question_id: question.id,
            question_text: question.text,
            type: question.type,
            points_possible: maxPoints,
            points_earned: pointsEarned,
            difficulty: question.difficulty,
            is_correct: isCorrect,
            is_partial: isPartial,
            student_answer: studentAnswer,
            correct_answer: getCorrectAnswerDisplay(question),
        });
    }

    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const passed = percentage >= exam.passing_score;

    return {
        session_id: session.id,
        exam_title: exam.title,
        total_score: Math.round(totalScore * 100) / 100,
        max_possible_score: Math.round(maxPossibleScore * 100) / 100,
        percentage: Math.round(percentage * 10) / 10,
        passed,
        passing_score: exam.passing_score,
        question_results: questionResults,
        proctoring_flags: session.proctoring_flags,
        duration_taken: session.started_at && session.completed_at
            ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)
            : 0,
        completed_at: session.completed_at || new Date().toISOString(),
    };
}

function getCorrectAnswerDisplay(question: Question): unknown {
    switch (question.type) {
        case 'multiple_choice': return question.correct_option;
        case 'checkbox': return question.correct_options;
        case 'fill_blank': return question.sample_answer;
        case 'true_false': return question.correct_answer;
        case 'matching': return question.pairs.map((_, i) => i);
        case 'reorder': return question.correct_order;
        default: return null;
    }
}
