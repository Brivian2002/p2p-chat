import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeMap = {
    sm: { image: 28, text: 'text-lg' },
    md: { image: 36, text: 'text-2xl' },
    lg: { image: 48, text: 'text-3xl' },
  };

  return (
    <div className="flex items-center gap-2.5 select-none">
      <Image
        src="/logo.png"
        alt="DropToGit logo"
        width={sizeMap[size].image}
        height={sizeMap[size].image}
        className="rounded-lg"
        priority
      />
      {showText && (
        <span className={`${sizeMap[size].text} font-bold tracking-tight`}>
          <span className="text-foreground">Drop</span>
          <span className="text-primary">To</span>
          <span className="text-foreground">Git</span>
        </span>
      )}
    </div>
  );
}
