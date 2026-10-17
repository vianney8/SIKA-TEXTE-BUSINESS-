import { forwardRef, type InputHTMLAttributes } from "react";
import { useToast } from "@/hooks/use-toast";
import { paymentPhotoError } from "@shared/payment-photo";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "accept" | "onChange" | "multiple"> & {
  onPhoto: (photo: File) => void;
};

const PaymentPhotoInput = forwardRef<HTMLInputElement, Props>(function PaymentPhotoInput(
  { onPhoto, ...props }, ref,
) {
  const { toast } = useToast();
  return (
    <input {...props} ref={ref} type="file" accept="image/*"
      onChange={(event) => {
        const photo = event.currentTarget.files?.[0];
        if (photo) {
          const error = paymentPhotoError(photo);
          if (error) toast({ title: "Photo non acceptée", description: error, variant: "destructive" });
          else onPhoto(photo);
        }
        // Allow selecting the same photo again after removal or a failed upload.
        event.currentTarget.value = "";
      }}
    />
  );
});

export default PaymentPhotoInput;
