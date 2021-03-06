import React from "react";
import * as Bootstrap from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCircle, faDownload, faUpload} from "@fortawesome/free-solid-svg-icons";
import IndexRow from "./IndexRow";
import api from "../../settings";


class IndexTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            configs: Array(0),
            running: {},
            configsInterval: setInterval(() => this.loadIndexes(), 10 * 1000),
            runningInterval: setInterval(() => this.loadRunningIndexes(), 1000),
            deletePopupShow: false
        }
        api.get('kibanaHost').then((response) => this.setState({dashBoardAddress: response.data + "/app/dashboards#/view/"})).catch(() => {
            clearInterval(this.state.runningInterval);
            this.setState({runningInterval: false});
        });
        this.loadIndexes();
    }

    exportConfigs = () => {
        api.get('/export/configs').then((response) => {
            let element = document.createElement("a");
            let data = JSON.stringify(response.data, null, 4)
            let file = new Blob([data], {type: 'application/json;charset=UTF-8'});
            element.href = URL.createObjectURL(file);
            element.download = "indexer-configs.conf";
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        });
    }

    importConfigs = (event) => {
        event.stopPropagation();
        event.preventDefault();
        let files = event.target.files;
        let reader = new FileReader();
        reader.readAsText(files[0]);
        reader.onload = (e) => {
            try {
                let data = [];
                for (const conf of JSON.parse(e.target.result)) {
                    data.push(JSON.stringify(conf));
                }
                api.post('/import/configs', data).then((res) => {
                    this.loadIndexes();
                    event.target.value = null;
                    this.props.addAlert({
                        variant: "success",
                        title: "Import successful",
                        message: "Successful import:\n\tnew: " + res.data[0] +
                            ",\n\tchanged: " + res.data[1],
                        durationSec: 9
                    })
                }).catch((e) => {
                    event.target.value = null;
                    this.props.addAlert({
                        variant: "danger",
                        title: "Import failed",
                        message: e,
                        durationSec: 20
                    })
                });
            } catch (e){
                event.target.value = null;
                this.props.addAlert({
                    variant: "danger",
                    title: "Import failed",
                    message: e,
                    durationSec: 20
                })
            }
        }
    }

    componentWillUnmount() {
        clearInterval(this.state.configsInterval);
        clearInterval(this.state.runningInterval);
    }

    render() {
        return (
            <>
                {this.renderDeletePopup()}
                {this.renderStatus()}
                <Bootstrap.Accordion>
                    <Bootstrap.Table responsive="lg" bordered>
                        <thead className={"thead-dark"}>
                        <tr>
                            <th scope="col">Index name</th>
                            <th scope="col">Status</th>
                            <th scope="col">Last update</th>
                            <th scope="col">Used in</th>
                            <th scope="col">Controls</th>
                        </tr>
                        </thead>
                        {this.state.configs.length > 0 ? this.state.configs.map((indexInfo, rowNumber) => this.renderRow(indexInfo, rowNumber))
                            : this.renderNoConfigsRow()}
                    </Bootstrap.Table>
                </Bootstrap.Accordion>
            </>
        )
    }

    renderNoConfigsRow() {
        return (
            <tbody>
            <tr>
                <td colSpan={5} className={"text-center"}><h3 className={"m-0"}><Bootstrap.Badge variant={"secondary"}>No
                    index configs</Bootstrap.Badge></h3></td>
            </tr>
            </tbody>
        )
    }

    loadIndexes() {
        api.get('configs').then((response) => {
            this.setState({
                configs: response.data,
            })
            if (!this.state.runningInterval) {
                this.props.addAlert({
                    variant: "success",
                    title: "Reconnected",
                    message: "Reconnected to api server",
                    durationSec: 5
                })
                this.setState({
                    runningInterval: setInterval(() => this.loadRunningIndexes(), 1000)
                })
                api.get('kibanaHost').then((response) => this.setState({dashBoardAddress: response.data + "/app/dashboards#/view/"})).catch(() => {
                    clearInterval(this.state.runningInterval);
                    this.setState({runningInterval: false});
                });
            }

        }).catch(() => {
            this.props.addAlert({
                variant: "danger",
                title: "Connection lost",
                message: "Connection to api server lost",
                durationSec: 9
            })
            clearInterval(this.state.runningInterval);
            this.setState({runningInterval: false});
        })
    }

    loadRunningIndexes() {
        api.get('running').then((response) => {
            if (!Object.keys(this.state.running).every(v => Object.keys(response.data).includes(v))) this.loadIndexes();
            this.setState({running: response.data});
        }).catch(() => {
            clearInterval(this.state.runningInterval);
            this.setState({runningInterval: false});
        })
    }

    showDeletePopup(id, index, dashboards, successFullRun) {
        this.setState({
            deletePopupId: id,
            deletePopupIndexName: index,
            deletePopupDashboards: dashboards,
            deletePopupSuccessFullRun: successFullRun,
            deletePopupDeleteDataCheck: false,
            deletePopupShow: true
        })
    }

    renderRow(indexInfo, rowNumber) {
        return (
            <IndexRow key={indexInfo.id} showDeletePopup={this.showDeletePopup.bind(this)}
                      addAlert={this.props.addAlert}
                      rowNumber={rowNumber} data={indexInfo} kibana={this.state.dashBoardAddress}
                      running={this.state.running[indexInfo.id]}/>
        );
    }

    renderDeletePopup() {
        return (
            <Bootstrap.Modal centered show={this.state.deletePopupShow}>
                <Bootstrap.Modal.Header className={"text-light bg-danger"}>
                    <Bootstrap.Modal.Title>
                        {"Deleting index: " + this.state.deletePopupIndexName}
                    </Bootstrap.Modal.Title>
                </Bootstrap.Modal.Header>
                <Bootstrap.Modal.Body className={"text-light bg-danger"}>
                    {(this.state.deletePopupDashboards && Object.keys(this.state.deletePopupDashboards).length > 0 && this.state.deletePopupSuccessFullRun) ? <>
                        Deleting index '{this.state.deletePopupIndexName}' will affect these dashboards:
                        <br/>
                        <ul>
                            {Object.keys(this.state.deletePopupDashboards).map(dashboardName =>
                                <li key={dashboardName}>{this.state.deletePopupDashboards[dashboardName]}</li>)}
                        </ul>
                    </> : ""}
                    Are you sure you want to delete this index?
                </Bootstrap.Modal.Body>
                <Bootstrap.Modal.Footer
                    className={this.state.deletePopupSuccessFullRun ? "justify-content-between" : ""}>
                    {this.state.deletePopupSuccessFullRun ?
                        <Bootstrap.Form.Switch label={'Also delete indexed data'}
                                               checked={this.state.deletePopupDeleteDataCheck}
                                               id="deletePopupDeleteDataCheck"
                                               onChange={(e) => this.setState({deletePopupDeleteDataCheck: e.target.checked})}/> : ""}
                    <div>
                        <Bootstrap.Button className={"mr-2"} variant="secondary"
                                          onClick={() => this.setState({deletePopupShow: false})}>
                            No
                        </Bootstrap.Button>
                        <Bootstrap.Button variant="danger" onClick={() => {
                            api.delete('configs/' + this.state.deletePopupId, {
                                params: {
                                    deleteData: this.state.deletePopupDeleteDataCheck
                                }
                            }).then(() => this.loadIndexes()).catch((error) => this.props.addAlert({
                                variant: "danger",
                                title: "Delete request error",
                                message: error,
                                durationSec: 300
                            }))
                            this.setState({deletePopupShow: false})
                        }}>
                            Yes, delete
                        </Bootstrap.Button>
                    </div>
                </Bootstrap.Modal.Footer>
            </Bootstrap.Modal>)
    }

    renderStatus() {
        return (
            <div className={"float-right"}>
                <div className={"float-right"}>
                    Status: {this.state.runningInterval ?
                    <FontAwesomeIcon className={"text-success"} icon={faCircle} title={"Online"}/> :
                    <Bootstrap.Spinner size="sm" variant={"danger"} animation={"grow"} title={"Offline"}/>}
                </div>
                <div className={"float-right mr-3"}>
                    <FontAwesomeIcon className={"mr-2 cursor-pointer"} icon={faDownload}
                                     title={"Export configs"} onClick={this.exportConfigs}/>
                    <FontAwesomeIcon className={"cursor-pointer"} icon={faUpload} title={"Import configs"}
                                     onClick={() => this.uploadElem.click()}/>
                    <input className={"d-none"} type='file' ref={(ref) => this.uploadElem = ref}
                           onChange={this.importConfigs}/>
                </div>
            </div>
        )
    }
}

export default IndexTable;