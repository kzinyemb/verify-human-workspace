import React from 'react';
import ReactDOM from 'react-dom/client';
import EditorialApp from './EditorialApp';
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';

// Your Clerk Publishable Key
const PUBLISHABLE_KEY = "pk_test_cHJlc2VudC1mbGFtaW5nby00OTU0LmNsZXJrLmFjY291bnRzLmRldiQ";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      
      {/* If the user IS logged in, show the full workspace */}
      <SignedIn>
        <EditorialApp />
      </SignedIn>

      {/* If the user is NOT logged in, show the secure login screen */}
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