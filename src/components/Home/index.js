import Header from '../Header'
import './index.css'
const Home = () => {
  const accessToken = Cookies.get('jwt_token')
  if (accessToken === undefined) {
    return <Redirect to="/login" />
  }
  return (
    <>
      <div className="home-container">
      <h1 className="home-heading">TODO Application</h1>
      </div>
      </>
  )
}
export default Home