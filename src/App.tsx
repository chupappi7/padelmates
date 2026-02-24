import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

// Pages
import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";
import GamesListPage from "./pages/Games/GamesListPage";
import CreateGamePage from "./pages/Games/CreateGamePage";
import GameDetailPage from "./pages/Games/GameDetailPage";
import EditGamePage from "./pages/Games/EditGamePage";
import ClubsListPage from "./pages/Clubs/ClubsListPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import UserProfilePage from "./pages/Profile/UserProfilePage";
import MyMatchesPage from "./pages/Games/MyMatchesPage";
import FriendsPage from "./pages/Friends/FriendsPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import InboxPage from "./pages/Messages/InboxPage";
import ChatPage from "./pages/Messages/ChatPage";
import GroupChatPage from "./pages/Messages/GroupChatPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<GamesListPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/games" element={<GamesListPage />} />
            <Route path="/games/create" element={<CreateGamePage />} />
            <Route path="/games/:id" element={<GameDetailPage />} />
            <Route path="/games/:id/edit" element={<EditGamePage />} />
            <Route path="/clubs" element={<ClubsListPage />} />
            <Route path="/my-matches" element={<MyMatchesPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<InboxPage />} />
            <Route path="/messages/game/:gameId" element={<GroupChatPage />} />
            <Route path="/messages/:chatId" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/user/:userId" element={<UserProfilePage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomTabBar />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
