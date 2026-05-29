import React from "react";
import { Camera } from "lucide-react";

const Logo = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Camera className="h-8 w-8 text-primary" />
      <span className="text-xl font-bold">FaunaScope</span>
    </div>
  );
};

export default Logo;
