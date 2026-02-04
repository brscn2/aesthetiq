export type ClerkGetToken = (options?: {
  template?: string;
}) => Promise<string | null>;

export const getClerkJwt = async (
  getToken: ClerkGetToken,
): Promise<string | null> => {
  const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
  return template ? getToken({ template }) : getToken();
};
