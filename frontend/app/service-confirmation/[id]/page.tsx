import ServiceConfirmation from '@/modules/service-confirmation/service-confirmation';

export default async function ServiceConfirmationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <ServiceConfirmation id={id} />
    );
}