import * as React from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface PasswordInputWithValidationProps extends React.ComponentProps<"input"> {
  value: string;
  showValidation?: boolean;
}

const PasswordInputWithValidation = React.forwardRef<HTMLInputElement, PasswordInputWithValidationProps>(
  ({ className, value, showValidation = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const validations = {
      minLength: value.length >= 6,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
    };

    const allValid = Object.values(validations).every(Boolean);

    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className,
            )}
            value={value}
            ref={ref}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-10 w-10 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        
        {showValidation && value && (
          <div className="space-y-1 text-sm">
            <ValidationItem 
              valid={validations.minLength} 
              text="Mínimo 6 caracteres" 
            />
            <ValidationItem 
              valid={validations.hasUpperCase} 
              text="Una letra mayúscula" 
            />
            <ValidationItem 
              valid={validations.hasLowerCase} 
              text="Una letra minúscula" 
            />
          </div>
        )}
      </div>
    );
  },
);
PasswordInputWithValidation.displayName = "PasswordInputWithValidation";

function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 transition-colors",
      valid ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
    )}>
      {valid ? (
        <Check className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
      <span>{text}</span>
    </div>
  );
}

export { PasswordInputWithValidation };
