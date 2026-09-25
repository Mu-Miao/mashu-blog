import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Archive, Home, NotFound, Post, Search, TagPage } from "./pages/Reader";
import { AdminShell, Assets, Editor, Keys, Login, PostList } from "./pages/Admin";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="post/:slug" element={<Post />} />
        <Route path="tag/:name" element={<TagPage />} />
        <Route path="archive" element={<Archive />} />
        <Route path="search" element={<Search />} />
        <Route path="admin/login" element={<Login />} />
        <Route path="admin" element={<AdminShell />}>
          <Route index element={<PostList />} />
          <Route path="post/new" element={<Editor />} />
          <Route path="post/:id" element={<Editor />} />
          <Route path="assets" element={<Assets />} />
          <Route path="keys" element={<Keys />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
