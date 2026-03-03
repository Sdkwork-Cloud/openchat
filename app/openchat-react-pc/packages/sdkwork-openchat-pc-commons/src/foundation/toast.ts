import { toast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info";

export function useToast() {
  const showToast = (message: string, type: ToastType = "info") => {
    switch (type) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      default:
        toast.info(message);
        break;
    }
  };

  return { showToast, toast };
}
