import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ProfileClient } from "@/components/profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user || !user.profile) redirect("/login");

  return <ProfileClient name={user.name} email={user.email} profile={user.profile} />;
}
