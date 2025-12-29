
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import StatementScreen from './screens/StatementScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import ProfileScreen from './screens/ProfileScreen';
import PlanManagementScreen from './screens/profile/PlanManagementScreen';
import AppearanceScreen from './screens/profile/AppearanceScreen';
import SmartRulesScreen from './screens/profile/SmartRulesScreen';
import AboutScreen from './screens/profile/AboutScreen';
import { SecurityScreen, DeleteAccountScreen, TwoFactorScreen, ChangeEmailScreen } from './screens/profile/SecurityScreens';
import { DataScreen } from './screens/profile/DataScreens';
import NotificationScreen from './screens/profile/NotificationScreen';
import WalletsScreen from './screens/WalletsScreen';
import MethodsScreen from './screens/MethodsScreen';
import ShortcutsScreen from './screens/ShortcutsScreen';
import ComparisonScreen from './screens/reports/ComparisonScreen';
import BehaviorScreen from './screens/reports/BehaviorScreen';
import ScoreScreen from './screens/reports/ScoreScreen'; // Imported

import { db } from './services/database';
import { ThemeProvider } from './components/ThemeHandler';
import { DataProvider } from './contexts/DataContext';

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
    return (
      <div className="min-h-screen bg-[#101622] flex items-center justify-center">
         <div className="size-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <DataProvider>
        <HashRouter>
          {/* Global Desktop/Tablet Wrapper - Centers the App */}
          <div className="flex justify-center min-h-screen bg-[#e0e5ec] dark:bg-[#050505] transition-colors duration-300">
            
            {/* Mobile App Shell */}
            <div className="w-full max-w-lg min-h-screen bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden flex flex-col font-display">
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
            </div>
          </div>
        </HashRouter>
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;
