import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Refine } from "@refinedev/core";
import { dataProvider } from "../../refine/dataProvider";
import { authProvider } from "../../refine/authProvider";

function PuckRuntimeProviders({ children }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <Refine
        dataProvider={dataProvider}
        authProvider={authProvider}
        resources={[
          { name: "snippets" },
          { name: "status" },
          { name: "comments" },
          { name: "page-configs" },
        ]}
      >
        {children}
      </Refine>
    </QueryClientProvider>
  );
}

export default PuckRuntimeProviders;
