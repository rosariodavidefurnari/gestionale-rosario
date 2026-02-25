import { Mars, NonBinary, Venus } from "lucide-react";

import type { ContactGender } from "../types";

export const contactGender: ContactGender[] = [
  { value: "male", label: "Uomo", icon: Mars },
  { value: "female", label: "Donna", icon: Venus },
  { value: "nonbinary", label: "Non binario", icon: NonBinary },
];
