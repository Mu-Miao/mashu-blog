import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Archive, Home, NotFound, Post, Search, TagPage } from "./pages/Reader";
import { AdminShell, Assets, Editor, Keys, Login, PostList } from "./pages/Admin";
import Tools from "./pages/Tools";
import AdminTools from "./pages/AdminTools";
import AdminComments from "./pages/AdminComments";
import Teaching from "./pages/Teaching";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="post/:slug" element={<Post />} />
        <Route path="tag/:name" element={<TagPage />} />
        <Route path="archive" element={<Archive />} />
        <Route path="search" element={<Search />} />
        <Route path="tools" element={<Tools />} />
        <Route path="teaching" element={<Teaching />} />
        <Route path="admin/login" element={<Login />} />
        <Route path="admin" element={<AdminShell />}>
          <Route index element={<PostList />} />
          <Route path="post/new" element={<Editor />} />
          <Route path="post/:id" element={<Editor />} />
          <Route path="assets" element={<Assets />} />
          <Route path="tools" element={<AdminTools />} />
          <Route path="keys" element={<Keys />} />
          <Route path="comments" element={<AdminComments />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
