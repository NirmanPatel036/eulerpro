import Loader from '@/components/ui/Loader';

export default function RootLoading() {
    return (
        <div style={{ minHeight: '100dvh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader label="Loading" />
        </div>
    );
}
