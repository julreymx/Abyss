import { useState } from 'react'
import JulesLanding from './JulesLanding'
import OSMentalAbyss from './OSMentalAbyss'

function App() {
  const [inAbyss, setInAbyss] = useState(false)

  if (inAbyss) {
    return <OSMentalAbyss />
  }

  return (
    <JulesLanding onEnter={() => setInAbyss(true)} />
  )
}

export default App
