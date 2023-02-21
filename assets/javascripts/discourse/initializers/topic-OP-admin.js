import { withPluginApi } from "discourse/lib/plugin-api";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";
import Topic from "discourse/models/topic";
import showModal from "discourse/lib/show-modal";
// import Composer from "discourse/models/composer";
// import DiscourseURL from "discourse/lib/url";
// import { getOwner } from "discourse-common/lib/get-owner";
// import I18n from "I18n";
// import { avatarFor } from "discourse/widgets/post";
// import ComponentConnector from "discourse/widgets/component-connector";
// import RawHtml from "discourse/widgets/raw-html";
// import { createWidget } from "discourse/widgets/widget";
// import { actionDescriptionHtml } from "discourse/widgets/post-small-action";
// import { h } from "virtual-dom";
// import { iconNode } from "discourse-common/lib/icon-library";
// import discourseLater from "discourse-common/lib/later";
// import { relativeAge } from "discourse/lib/formatter";
// import renderTags from "discourse/lib/render-tags";
// import renderTopicFeaturedLink from "discourse/lib/render-topic-featured-link";

const pluginId = "topic-OP-admin";

function init(api) {
  const currentUser = api.getCurrentUser();

  if (!currentUser) {
    return;
  }

  Topic.reopenClass({
    setSlowMode(topicId, seconds, enabledUntil) {
      const data = { seconds };
      data.enabled_until = enabledUntil;
      if (currentUser.canManageTopic) {
        // Discourse default ajax
        return ajax(`/t/${topicId}/slow_mode`, { type: "PUT", data });
      } else {
        data.id = topicId;
        return ajax("/topic_op_admin/update_slow_mode", { type: "PUT", data });
      }
    },
  });
  api.attachWidgetAction("topic-OP-admin-menu", "set-OP-admin-status", function () {
    // TODO: 添加其他开关
    const dialog = this.register.lookup("service:dialog");
    const topic = this.attrs.topic;
    showModal("set-topic-op-admin-status", {
      model: {
        topic,
        action: {
          submit() {
            this.send("closeModal");
            ajax("/topic_op_admin/set_topic_op_admin_status", {
              method: "POST",
              data: {
                id: topic.id,
                new_status: this.model.enables,
              },
            })
              .then((res) => {
                if (!res.success) {
                  dialog.alert(res.message);
                }
              })
              .catch(popupAjaxError);
          },
        },
        enables: {
          close: topic.topic_op_admin_status.can_close,
          archive: topic.topic_op_admin_status.can_archive,
          make_PM: topic.topic_op_admin_status.can_make_PM,
          visible: topic.topic_op_admin_status.can_visible,
          slow_mode: topic.topic_op_admin_status.can_slow_mode,
          set_timer: topic.topic_op_admin_status.can_set_timer,
          silence: topic.topic_op_admin_status.can_silence,
          fold_posts: topic.topic_op_admin_status.can_fold_posts,
        },
      },
    });
  });
  api.attachWidgetAction("topic-OP-admin-menu", "apply-for-op-admin", function () {
    // TODO 添加说明文本
    const dialog = this.register.lookup("service:dialog");
    const topic = this.attrs.topic;
    showModal("request-op-admin-form", {
      model: {
        submit() {
          this.send("closeModal");
          const rawText = `
请求将 [${topic.title}](${topic.url}) 设为楼主自我管理。
### 原因：
${this.reason}
`;
          ajax("/topic_op_admin/request_for_topic_op_admin", {
            method: "POST",
            data: {
              id: topic.id,
              raw: rawText,
            },
          })
            .then((res) => {
              dialog.alert(res.message);
            })
            .catch(popupAjaxError);
        },
      },
    });
  });
  api.attachWidgetAction("topic-OP-admin-menu", "topicOPtoggleClose", function () {
    const topic = this.register.lookup("controller:topic");
    const dialog = this.register.lookup("service:dialog");
    ajax("/topic_op_admin/update_topic_status/", {
      method: "POST",
      data: {
        id: this.attrs.topic.id,
        status: "closed",
        enabled: !this.attrs.topic.closed,
      },
    })
      .then((res) => {
        if (!res.success) {
          dialog.alert(res.message);
        } else {
          topic.model.toggleProperty("closed");
        }
      })
      .catch(popupAjaxError);
  });
  api.attachWidgetAction("topic-OP-admin-menu", "topicOPtoggleVisibility", function () {
    const topic = this.register.lookup("controller:topic");
    const dialog = this.register.lookup("service:dialog");
    ajax("/topic_op_admin/update_topic_status/", {
      method: "POST",
      data: {
        id: this.attrs.topic.id,
        status: "visible",
        enabled: !this.attrs.topic.visible,
      },
    })
      .then((res) => {
        if (!res.success) {
          dialog.alert(res.message);
        } else {
          topic.model.toggleProperty("visible");
        }
      })
      .catch(popupAjaxError);
  });
  api.decorateWidget("timeline-controls:after", (helper) => {
    const { fullScreen, topic } = helper.attrs;
    if (!fullScreen && currentUser) {
      return helper.attach("topic-OP-admin-menu-button", {
        topic,
        addKeyboardTargetClass: false,
        currentUser,
      });
    }
  });
  api.decorateWidget("topic-footer-buttons:before", (helper) => {
    const { fullScreen, topic } = helper.attrs;
    if (!fullScreen && currentUser) {
      return helper.attach("topic-OP-admin-menu-button", {
        topic,
        addKeyboardTargetClass: false,
        currentUser,
      });
    }
  });
  api.registerTopicFooterButton({
    // TODO
    id: "topic-OP-admin-menu-button",
    icon() {
      return "cog";
    },
    priority: 99999,
    action: "showTopicOPAdminMenu",
    dropdown() {
      return this.site.mobileView;
    },
    classNames: ["topic-OP-admin-button"],
    displayed() {
      // console.log(this);
      return true;
    },
  });
}

export default {
  name: pluginId,

  initialize(container) {
    if (!container.lookup("site-settings:main").topic_op_admin_enabled) {
      return;
    }
    withPluginApi("1.6.0", init);
  },
};
