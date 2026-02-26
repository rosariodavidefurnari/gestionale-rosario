import type { Client } from "../types";
import { ClientCreate } from "./ClientCreate";
import { ClientEdit } from "./ClientEdit";
import { ClientList } from "./ClientList";
import { ClientShow } from "./ClientShow";

export default {
  list: ClientList,
  show: ClientShow,
  edit: ClientEdit,
  create: ClientCreate,
  recordRepresentation: (record: Client) => record?.name,
};
