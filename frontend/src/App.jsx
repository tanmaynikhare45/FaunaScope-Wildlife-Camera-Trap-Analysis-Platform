import './App.css'
import Home from './pages/Home'
import {Route,Routes} from 'react-router-dom'
import ClerkProviderPage from './auth/ClerkProviderPage'
import AuthenticationPage from './auth/AuthenticationPage'
import Layout from './components/layout/Layout'
import UploadData from './pages/UploadData'
import Dashboard from './pages/Dashboard'


function App() {
  

  return (
    <ClerkProviderPage>
      
        <Routes>
          <Route path='/sign-in/*' element={<AuthenticationPage/>}/>
          <Route path='/sign-up' element={<AuthenticationPage/>}/>
          <Route element={<Layout/>}>
            <Route path='/' element={<Home/>}/>
            <Route path='/upload' element={<UploadData/>}/>
            <Route path='/dashboard' element={<Dashboard/>}/>
          </Route>
        </Routes>
      
    </ClerkProviderPage>
    
  )
}

export default App
