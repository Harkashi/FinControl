
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Services & Contexts (Eager load needed)
import { db } from './services/database';
import { ThemeProvider } from './components/ThemeHandler';
import { DataProvider } from './contexts/DataContext';

// Eager load entry screens to avoid flash on startup
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';

// Lazy load feature screens
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const AddTransactionScreen = lazy(() => import('./screens/AddTransactionScreen'));
const StatementScreen = lazy(() => import('./screens/StatementScreen'));
const BudgetsScreen = lazy(() => import('./screens/BudgetsScreen'));
const CategoriesScreen = lazy(() => import('./screens/CategoriesScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const WalletsScreen = lazy(() => import('./screens/WalletsScreen'));
const MethodsScreen = lazy(() => import('./screens/MethodsScreen'));
const ShortcutsScreen = lazy(() => import('./screens/ShortcutsScreen'));

// Lazy load sub-screens (Profile & Reports)
const PlanManagementScreen = lazy(() => import('./screens/profile/PlanManagementScreen'));
const AppearanceScreen = lazy(() => import('./screens/profile/AppearanceScreen'));
const SmartRulesScreen = lazy(() => import('./screens/profile/SmartRulesScreen'));
const AboutScreen = lazy(() => import('./screens/profile/AboutScreen'));
const NotificationScreen = lazy(() => import('./screens/profile/NotificationScreen'));

// Named exports lazy loading
const SecurityScreen = lazy(() => import('./screens/profile/SecurityScreens').then(module => ({ default: module.SecurityScreen })));
const TwoFactorScreen = lazy(() => import('./screens/profile/SecurityScreens').then(module => ({ default: module.TwoFactorScreen })));
const ChangeEmailScreen = lazy(() => import('./screens/profile/SecurityScreens').then(module => ({ default: module.ChangeEmailScreen })));
const DeleteAccountScreen = lazy(() => import('./screens/profile/SecurityScreens').then(module => ({ default: module.DeleteAccountScreen })));
const DataScreen = lazy(() => import('./screens/profile/DataScreens').then(module => ({ default: module.DataScreen })));

// Reports
const ComparisonScreen = lazy(() => import('./screens/reports/ComparisonScreen'));
const BehaviorScreen = lazy(() => import('./screens/reports/BehaviorScreen'));
const ScoreScreen = lazy(() => import('./screens/reports/ScoreScreen'));

// Suppress specific Recharts warning
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('The width(-1) and height(-1) of chart should be greater than 0')) {
    return;
  }
  originalWarn(...args);
};

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  if (!db.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const LoadingFallback = () => (
  <div className="min-h-screen bg-background-light dark:bg-[#101622] flex items-center justify-center">
     <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    db.checkSession().then((isAuthenticated) => {
      setIsReady(true);
      if (isAuthenticated) {
        db.logActivity();
      }
    });
  }, []);

  if (!isReady) {
    return <LoadingFallback />;
  }

  return (
    <ThemeProvider>
      <DataProvider>
        <HashRouter>
          {/* Global Desktop/Tablet Wrapper - Centers the App */}
          <div className="flex justify-center min-h-screen bg-[#e0e5ec] dark:bg-[#050505] transition-colors duration-300">
            
            {/* Mobile App Shell */}
            <div className="w-full max-w-lg min-h-screen bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden flex flex-col font-display">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<WelcomeScreen />} />
                  <Route path="/login" element={<LoginScreen />} />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
                  <Route path="/add" element={<ProtectedRoute><AddTransactionScreen /></ProtectedRoute>} />
                  <Route path="/shortcuts" element={<ProtectedRoute><ShortcutsScreen /></ProtectedRoute>} />
                  <Route path="/statement" element={<ProtectedRoute><StatementScreen /></ProtectedRoute>} />
                  <Route path="/budgets" element={<ProtectedRoute><BudgetsScreen /></ProtectedRoute>} />
                  <Route path="/categories" element={<ProtectedRoute><CategoriesScreen /></ProtectedRoute>} />
                  <Route path="/wallets" element={<ProtectedRoute><WalletsScreen /></ProtectedRoute>} />
                  <Route path="/methods" element={<ProtectedRoute><MethodsScreen /></ProtectedRoute>} />
                  <Route path="/reports/comparison" element={<ProtectedRoute><ComparisonScreen /></ProtectedRoute>} />
                  <Route path="/reports/behavior" element={<ProtectedRoute><BehaviorScreen /></ProtectedRoute>} />
                  <Route path="/reports/score" element={<ProtectedRoute><ScoreScreen /></ProtectedRoute>} />
                  
                  {/* Profile & Settings Routes */}
                  <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
                  <Route path="/profile/plan" element={<ProtectedRoute><PlanManagementScreen /></ProtectedRoute>} />
                  <Route path="/profile/security" element={<ProtectedRoute><SecurityScreen /></ProtectedRoute>} />
                  <Route path="/profile/2fa" element={<ProtectedRoute><TwoFactorScreen /></ProtectedRoute>} />
                  <Route path="/profile/email" element={<ProtectedRoute><ChangeEmailScreen /></ProtectedRoute>} />
                  <Route path="/profile/delete-account" element={<ProtectedRoute><DeleteAccountScreen /></ProtectedRoute>} />
                  <Route path="/profile/data" element={<ProtectedRoute><DataScreen /></ProtectedRoute>} />
                  <Route path="/profile/notifications" element={<ProtectedRoute><NotificationScreen /></ProtectedRoute>} />
                  <Route path="/profile/appearance" element={<ProtectedRoute><AppearanceScreen /></ProtectedRoute>} />
                  <Route path="/profile/smart-rules" element={<ProtectedRoute><SmartRulesScreen /></ProtectedRoute>} />
                  <Route path="/profile/about" element={<ProtectedRoute><AboutScreen /></ProtectedRoute>} />
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </HashRouter>
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;
