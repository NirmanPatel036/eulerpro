import Loader from '@/components/ui/Loader';

export default function StudentLoading() {
    return (
        <div style={{ minHeight: '100dvh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader size={40} label="Loading" />
        </div>
    );
}
