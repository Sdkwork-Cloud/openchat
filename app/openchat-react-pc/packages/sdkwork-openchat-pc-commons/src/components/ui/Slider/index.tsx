import React from "react";
import { cn } from "../../../lib/utils";

export interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}) => {
  const currentValue = value[0] || min;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([Number(e.target.value)]);
  };

  return (
    <div
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
    >
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className="absolute h-full bg-primary transition-all duration-200"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className="absolute w-full h-full opacity-0 cursor-pointer"
      />
      <div
        className="absolute h-5 w-5 rounded-full border-2 border-primary bg-bg-secondary shadow-md transition-transform duration-200 hover:scale-110"
        style={{ left: `calc(${percentage}% - 10px)` }}
      />
    </div>
  );
};

export default Slider;

