import { WDialog } from "../leafletClasses";
import Sortable from "../../lib/sortable";
import AssignDialog from "./assignDialog";
import SetCommentDialog from "./setCommentDialog";
import { getAgent } from "../server";
import { getSelectedOperation } from "../selectedOp";
import OverflowMenu from "../overflowMenu";
import { listenForAddedPortals, listenForPortalDetails } from "../uiCommands";
import wX from "../wX";

const MarkerList = WDialog.extend({
  statics: {
    TYPE: "markerList"
  },

  initialize: function(map, options) {
    if (!map) map = window.map;
    this.type = MarkerList.TYPE;
    WDialog.prototype.initialize.call(this, map, options);
  },

  addHooks: function() {
    if (!this._map) return;
    WDialog.prototype.addHooks.call(this);
    this._operation = getSelectedOperation();
    const context = this;
    this._UIUpdateHook = newOpData => {
      context.markerListUpdate(newOpData);
    };
    window.addHook("wasabeeUIUpdate", this._UIUpdateHook);
    window.addHook("portalAdded", listenForAddedPortals);
    window.addHook("portalDetailLoaded", listenForPortalDetails);
    this._displayDialog();
  },

  removeHooks: function() {
    WDialog.prototype.removeHooks.call(this);
    window.removeHook("portalAdded", listenForAddedPortals);
    window.removeHook("portalDetailLoaded", listenForPortalDetails);
    window.removeHook("wasabeeUIUpdate", this._UIUpdateHook);
  },

  _displayDialog: function() {
    for (const f of this._operation.fakedPortals) {
      window.portalDetail.request(f.id);
    }

    this._dialog = window.dialog({
      title: wX("MARKER_LIST", this._operation.name),
      width: "auto",
      height: "auto",
      // position: { my: "center top", at: "center center" },
      html: this.getListDialogContent(this._operation).table,
      dialogClass: "wasabee-dialog wasabee-dialog-markerlist",
      closeCallback: () => {
        this.disable();
        delete this._dialog;
      },
      id: window.plugin.wasabee.static.dialogNames.markerList
    });
  },

  markerListUpdate: function(operation) {
    if (operation.ID != this._operation.ID) this._operation = operation;
    const table = this.getListDialogContent(operation).table;
    this._dialog.html(table);
    this._dialog.dialog(
      wX("OPTION"),
      wX("TITLE"),
      wX("MARKER_LIST", operation.name)
    );
  },

  getListDialogContent: function(operation) {
    const content = new Sortable();
    content.fields = [
      {
        name: wX("ORDER"),
        value: marker => marker.order,
        // sort: (a, b) => (a < b),
        format: (a, m) => {
          a.textContent = m;
        }
      },
      {
        name: wX("PORTAL"),
        value: marker => operation.getPortal(marker.portalId).name,
        sort: (a, b) => a.localeCompare(b),
        format: (a, m, marker) => {
          a.appendChild(
            operation.getPortal(marker.portalId).displayFormat(operation)
          );
        }
      },
      {
        name: wX("TYPE"),
        value: marker =>
          window.plugin.wasabee.static.markerTypes.get(marker.type).label ||
          "unknown",
        sort: (a, b) => a.localeCompare(b),
        format: (a, m) => {
          a.textContent = m;
        }
      },
      {
        name: wX("COMMENT"),
        value: marker => marker.comment,
        sort: (a, b) => a.localeCompare(b),
        format: (a, m, marker) => {
          const comment = L.DomUtil.create("a", "", a);
          comment.textContent = m;
          L.DomEvent.on(comment, "click", () => {
            const scd = new SetCommentDialog(window.map);
            scd.setup(marker, operation);
            scd.enable();
          });
        }
      },
      {
        name: wX("ASS_TO"),
        value: marker => {
          if (marker.assignedTo != null && marker.assignedTo != "") {
            const agent = getAgent(marker.assignedTo);
            if (agent != null) {
              return agent.name;
            } else {
              return "looking up: [" + marker.assignedTo + "]";
            }
          }
          return "";
        },
        sort: (a, b) => a.localeCompare(b),
        format: (a, m, agent) => {
          const assigned = L.DomUtil.create("a", "", a);
          assigned.textContent = m;
          L.DomEvent.on(assigned, "click", () => {
            const ad = new AssignDialog();
            ad.setup(agent, operation);
            ad.enable();
          });
        }
      },
      {
        name: wX("DONE"),
        value: marker => marker.state,
        sort: (a, b) => a.localeCompare(b),
        format: (a, m) => {
          if (m == "completed") {
            a.textContent = wX("YES");
          } else {
            a.textContent = wX("NO");
          }
        }
      },
      {
        name: "",
        sort: null,
        value: m => m,
        format: (o, e) => this.makeMarkerDialogMenu(o, e)
      }
    ];
    content.sortBy = 0;
    content.items = operation.markers;
    return content;
  },

  makeMarkerDialogMenu: function(list, data) {
    const operation = getSelectedOperation();
    const state = new OverflowMenu();
    const options = [
      {
        label: wX("SET_COMMENT"),
        onclick: () => {
          const scd = new SetCommentDialog(window.map);
          scd.setup(data, operation);
          scd.enable();
        }
      },
      {
        label: wX("DELETE"),
        onclick: () => operation.removeMarker(data)
      }
    ];
    if (operation.IsServerOp()) {
      options.push({
        label: wX("ASSIGN"),
        onclick: () => {
          const ad = new AssignDialog();
          ad.setup(data, operation);
          ad.enable();
        }
      });
    }
    state.items = options;
    list.className = "menu";
    list.appendChild(state.button);
  }
});

export default MarkerList;
