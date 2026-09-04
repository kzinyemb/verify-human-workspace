import React from 'react';
import ReactDOM from 'react-dom/client';
import EditorialApp from './EditorialApp';
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      
      {/* Once invited and logged in, they go straight to the pad */}
      <SignedIn>
        <EditorialApp />
      </SignedIn>

      {/* If not logged in, show the Clerk login screen */}
      <SignedOut>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          width: '100vw',
          backgroundColor: '#0f172a' 
        }}>
          <SignIn routing="hash" />
        </div>
      </SignedOut>

    </ClerkProvider>
  </React.StrictMode>
);