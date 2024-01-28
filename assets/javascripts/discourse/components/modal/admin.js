import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { buildParams, replaceRaw } from "../../lib/raw-event-helper";

export default class AdminModal extends Component {
  @service dialog;
  @service siteSettings;
  @service store;

  @action
  submit() {
    if (this.loading) {
      return;
    }
    this.setProperties({ loading: true });
    ajax("/topic_op_admin/set_topic_op_admin_status", {
      method: "POST",
      data: {
        id: topic.id,
        new_status: this.model.enables,
      },
    })
      .then((res) => {
        this.setProperties({ loading: false });
        this.send("closeModal");
        if (!res.success) {
          dialog.alert(res.message);
        } else {
          window.location.reload();
        }
      })
      .catch(popupAjaxError);
  }
}