import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { UserProvider } from './UserContext.jsx'
import { Refine } from '@refinedev/core'
import { dataProvider } from './refine/dataProvider.js'
import { authProvider } from './refine/authProvider.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
    <StrictMode>
      <UserProvider>
        <QueryClientProvider client={queryClient}>
          <Refine
            dataProvider={dataProvider}
            authProvider={authProvider}
            resources={[
              { name: 'snippets' },
              { name: 'status' },
              { name: 'comments' },
            ]}
          >
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </Refine>
        </QueryClientProvider>
      </UserProvider>
  </StrictMode>
)
