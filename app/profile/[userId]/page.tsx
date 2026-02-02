import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Image from "next/image";

async function getUser(userId: string) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/users/${userId}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return res.json();
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { userId } = await params;

  if (!session) {
    redirect("/login");
  }

  const user = await getUser(userId);
  const isOwnProfile = session.user.id === userId;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center space-x-6 mb-6">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                width={100}
                height={100}
                className="rounded-full"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-3xl font-semibold">
                  {user.name?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {user.bio && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Bio</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {user._count.posts}
              </p>
              <p className="text-gray-600">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-gray-600">Followers</p>
            </div>
          </div>

          {isOwnProfile && (
            <div className="mt-6 border-t pt-4">
              <p className="text-sm text-gray-600">
                Profile editing functionality can be added here
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
