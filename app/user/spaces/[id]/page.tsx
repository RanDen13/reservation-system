import EventSpacePage from "@/app/components/pages/Spaces/EventSpacePage";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  return <EventSpacePage id={id} />;
};

export default page;
