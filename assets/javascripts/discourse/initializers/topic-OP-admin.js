import { withPluginApi } from "discourse/lib/plugin-api";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { ajax } from "discourse/lib/ajax";
import Topic from "discourse/models/topic";
import showModal from "discourse/lib/show-modal";
import TopicTimer from "discourse/models/topic-timer";
import I18n from "I18n";
import Composer from "discourse/models/composer";
// import DiscourseURL from "discourse/lib/url";
// import { getOwner } from "discourse-common/lib/get-owner";
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
  TopicTimer.reopenClass({
    update(topicId, time, basedOnLastPost, statusType, categoryId, durationMinutes) {
      let data = {
        time,
        status_type: statusType,
      };
      if (basedOnLastPost) {
        data.based_on_last_post = basedOnLastPost;
      }
      if (categoryId) {
        data.category_id = categoryId;
      }
      if (durationMinutes) {
        data.duration_minutes = durationMinutes;
      }
      if (currentUser.canManageTopic) {
        // Discourse default ajax
        return ajax({
          url: `/t/${topicId}/timer`,
          type: "POST",
          data,
        });
      } else {
        data.id = topicId;
        return ajax({
          url: `/topic_op_admin/set_topic_op_timer`,
          type: "POST",
          data,
        });
      }
    },
  });

  api.attachWidgetAction("topic-OP-admin-menu", "set-OP-admin-status", function () {
    // TODO: 添加其他开关!
    const dialog = this.register.lookup("service:dialog");
    const topic = this.attrs.topic;
    showModal("set-topic-op-admin-status", {
      model: {
        topic,
        currentUser,
        action: {
          submit() {
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
    const composerController = this.register.lookup("controller:composer");
    const dialog = this.register.lookup("service:dialog");
    const topic = this.attrs.topic;
    const textTemplate =
      I18n.t("topic_op_admin.apply_modal.apply_template").replaceAll("#", `[${topic.title}](${topic.url})`) +
      `\n${I18n.t("topic_op_admin.apply_modal.apply_reason")}\n`;
    showModal("request-op-admin-form", {
      loading: false,
      model: {
        submit() {
          this.setProperties({ loading: true });
          ajax("/topic_op_admin/request_for_topic_op_admin", {
            method: "POST",
            data: {
              id: topic.id,
              raw: textTemplate + this.reason,
            },
          })
            .then((res) => {
              this.setProperties({ loading: false });
              this.send("closeModal");
              dialog.alert(res.message);
            })
            .catch(popupAjaxError);
        },
        showComposer() {
          this.send("closeModal");
          composerController.open({
            action: Composer.PRIVATE_MESSAGE,
            draftKey: Composer.NEW_PRIVATE_MESSAGE_KEY,
            recipients: currentUser.op_admin_form_recipients,
            topicTitle: I18n.t("topic_op_admin.apply_modal.apply_template_title").replaceAll("#", topic.title),
            topicBody: textTemplate,
            archetypeId: "private_message",
          });
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
  api.attachWidgetAction("topic-OP-admin-menu", "topicOPtoggleArchived", function () {
    const topic = this.register.lookup("controller:topic");
    const dialog = this.register.lookup("service:dialog");
    ajax("/topic_op_admin/update_topic_status/", {
      method: "POST",
      data: {
        id: this.attrs.topic.id,
        status: "archived",
        enabled: !this.attrs.topic.archived,
      },
    })
      .then((res) => {
        if (!res.success) {
          dialog.alert(res.message);
        } else {
          topic.model.toggleProperty("archived");
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
