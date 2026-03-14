import { useState } from 'react'
import JulesLanding from './JulesLanding'
import OSMentalAbyss from './OSMentalAbyss'
import { AuthProvider } from './auth/AuthContext'

function App() {
  const [inAbyss, setInAbyss] = useState(false)

  if (inAbyss) {
    return <AuthProvider><OSMentalAbyss /></AuthProvider>
  }

  return (
    <AuthProvider><JulesLanding onEnter={() => setInAbyss(true)} /></AuthProvider>
  )
}

export default App
