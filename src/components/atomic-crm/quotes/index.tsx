import * as React from "react";

const QuoteList = React.lazy(() => import("./QuoteList"));

export default {
  list: QuoteList,
  recordRepresentation: (record: any) => record?.description || "Preventivo",
};
