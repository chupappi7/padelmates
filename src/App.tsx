import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const LoginPage = lazy(() => import("./pages/Auth/LoginPage"));
const SignupPage = lazy(() => import("./pages/Auth/SignupPage"));
const OnboardingPage = lazy(() => import("./pages/Auth/OnboardingPage"));
const GamesListPage = lazy(() => import("./pages/Games/GamesListPage"));
const CreateGamePage = lazy(() => import("./pages/Games/CreateGamePage"));
const GameDetailPage = lazy(() => import("./pages/Games/GameDetailPage"));
const EditGamePage = lazy(() => import("./pages/Games/EditGamePage"));
const ClubsListPage = lazy(() => import("./pages/Clubs/ClubsListPage"));
const CreateClubPage = lazy(() => import("./pages/Clubs/CreateClubPage"));
const ClubDetailPage = lazy(() => import("./pages/Clubs/ClubDetailPage"));
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));
const UserProfilePage = lazy(() => import("./pages/Profile/UserProfilePage"));
const MyMatchesPage = lazy(() => import("./pages/Games/MyMatchesPage"));
const FriendsPage = lazy(() => import("./pages/Friends/FriendsPage"));
const NotificationsPage = lazy(() => import("./pages/Notifications/NotificationsPage"));
const InboxPage = lazy(() => import("./pages/Messages/InboxPage"));
const ChatPage = lazy(() => import("./pages/Messages/ChatPage"));
const GroupChatPage = lazy(() => import("./pages/Messages/GroupChatPage"));
const EloPage = lazy(() => import("./pages/Elo/EloPage"));
const MatchHistoryPage = lazy(() => import("./pages/Profile/MatchHistoryPage"));
const JoinPage = lazy(() => import("./pages/Games/JoinPage"));
const SettingsPage = lazy(() => import("./pages/Profile/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<GamesListPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/games" element={<GamesListPage />} />
              <Route path="/games/create" element={<CreateGamePage />} />
              <Route path="/games/:id" element={<GameDetailPage />} />
              <Route path="/games/:id/edit" element={<EditGamePage />} />
              <Route path="/clubs" element={<ClubsListPage />} />
              <Route path="/clubs/create" element={<CreateClubPage />} />
              <Route path="/clubs/:id" element={<ClubDetailPage />} />
              <Route path="/my-matches" element={<MyMatchesPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/messages" element={<InboxPage />} />
              <Route path="/messages/game/:gameId" element={<GroupChatPage />} />
              <Route path="/messages/:chatId" element={<ChatPage />} />
              <Route path="/elo" element={<EloPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/match-history" element={<MatchHistoryPage />} />
              <Route path="/match-history/:userId" element={<MatchHistoryPage />} />
              <Route path="/user/:userId" element={<UserProfilePage />} />
              <Route path="/join/:gameId" element={<JoinPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          
          <BottomTabBar />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
