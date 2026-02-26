import type { Project } from "../types";
import { ProjectCreate } from "./ProjectCreate";
import { ProjectEdit } from "./ProjectEdit";
import { ProjectList } from "./ProjectList";
import { ProjectShow } from "./ProjectShow";

export default {
  list: ProjectList,
  show: ProjectShow,
  edit: ProjectEdit,
  create: ProjectCreate,
  recordRepresentation: (record: Project) => record?.name,
};
