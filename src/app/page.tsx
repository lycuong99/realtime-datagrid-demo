import UserList from "@/app/UserList";

export default function Home() {
  return (
    <>
      <main className="py-20">
        <section className="container mx-auto">
          <UserList />
        </section>
      </main>
    </>
  );
}
