import type { Sale } from "../types";

export default {
  recordRepresentation: (record: Sale) =>
    `${record.first_name} ${record.last_name}`,
};
