// utils/session.js
export const getSessionId = () => {
  let session = localStorage.getItem("session_id");
  if (!session) {
    session = crypto.randomUUID();
    localStorage.setItem("session_id", session);
  }
  return session;
};
