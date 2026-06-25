import React from "react";

interface RoleGateProps {
  allowedRoles: string[];
  currentRole?: string;
  children: React.ReactNode;
}

export default function RoleGate({ allowedRoles, currentRole, children }: RoleGateProps) {
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return null;
  }

  return <>{children}</>;
}
