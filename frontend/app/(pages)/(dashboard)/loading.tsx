export default function Loading() {
  return (
    <div className="flex items-center justify-center py-12 h-[calc(100vh-200px)]">
      <div className="animate-spin h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
