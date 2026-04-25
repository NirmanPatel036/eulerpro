import Loader from '@/components/ui/Loader';

export default function AuthLoading() {
    return (
        <div style={{ background: '#330c26' }}>
            <Loader label="Authenticating" />
        </div>
    );
}
