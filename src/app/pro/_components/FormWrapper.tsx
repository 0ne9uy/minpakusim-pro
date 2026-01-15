export default function FormWrapper({
  title,
  desc,
  children,
  className,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-fit w-full flex-col items-center justify-center gap-10 bg-[#f3f3f3] ${className}`}
    >
      <div className="flex w-full flex-col gap-2">
        <h3 className="text-xl">{title}</h3>
        <p className="text-[#71717A] text-sm">{desc}</p>
      </div>
      {children}
    </div>
  );
}
