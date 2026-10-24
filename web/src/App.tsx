import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";

const Home = lazy(() => import("./pages/Reader").then((module) => ({ default: module.Home })));
const Post = lazy(() => import("./pages/Reader").then((module) => ({ default: module.Post })));
const Archive = lazy(() => import("./pages/Reader").then((module) => ({ default: module.Archive })));
const Search = lazy(() => import("./pages/Reader").then((module) => ({ default: module.Search })));
const TagPage = lazy(() => import("./pages/Reader").then((module) => ({ default: module.TagPage })));
const NotFound = lazy(() => import("./pages/Reader").then((module) => ({ default: module.NotFound })));
const AdminShell = lazy(() => import("./pages/Admin").then((module) => ({ default: module.AdminShell })));
const Assets = lazy(() => import("./pages/Admin").then((module) => ({ default: module.Assets })));
const Editor = lazy(() => import("./pages/Admin").then((module) => ({ default: module.Editor })));
const Keys = lazy(() => import("./pages/Admin").then((module) => ({ default: module.Keys })));
const Login = lazy(() => import("./pages/Admin").then((module) => ({ default: module.Login })));
const PostList = lazy(() => import("./pages/Admin").then((module) => ({ default: module.PostList })));
const Tools = lazy(() => import("./pages/Tools"));
const AdminTools = lazy(() => import("./pages/AdminTools"));
const AdminComments = lazy(() => import("./pages/AdminComments"));
const Teaching = lazy(() => import("./pages/Teaching"));

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
