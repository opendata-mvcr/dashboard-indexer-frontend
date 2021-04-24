import ReactDOM from 'react-dom';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import reportWebVitals from './reportWebVitals';
import Home from "./Home";
import {BrowserRouter as Router, Route} from "react-router-dom";
import React from "react";
import Edit from "./Edit";
import NavBar from "./NavBar";
import Toast from "./Toast";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            alerts: []
        }
    }

    addAlert = (alertObj) => {
        this.setState((prev) => ({
            alerts: prev.alerts.concat([alertObj])
        }))
    }

    render() {
        return (
            <Router>
                <NavBar/>
                <Route exact path={"/"}>
                    <Home addAlert={this.addAlert}/>
                </Route>
                <Route exact path={["/index/:name", "/index"]} children={<Edit addAlert={this.addAlert}/>}/>
                <div className={"tousts p-4 mh-100  overflow-auto"}>
                    {this.state.alerts.map((alert, index) => <Toast key={index} message={alert.message}
                                                                    variant={alert.variant}
                                                                    title={alert.title}
                                                                    durationSec={alert.durationSec}/>
                    )}
                </div>
            </Router>
        )
    }
}

// ========================================

ReactDOM.render(
    <App/>,
    document.getElementById('root')
)
;

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
