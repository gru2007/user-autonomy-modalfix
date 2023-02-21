# frozen_string_literal: true

require_relative "../lib/bot.rb"

class TopicOpAdminController < ::ApplicationController
  before_action :ensure_logged_in

  def update_topic_status
    unless SiteSetting.topic_op_admin_enabled
      return render_fail "topic_op_admin.not_enabled", status: 405
    end

    params.require(:status)
    params.require(:enabled)
    params.permit(:until)

    topic = Topic.find_by({ id: params[:id] })
    status = params[:status]
    topic_id = params[:topic_id].to_i
    enabled = params[:enabled] == "true"
    params[:until] === "" ? params[:until] = nil : params[:until]

    guardian.ensure_can_see_topic!(topic)

    case status
    when "closed"
      unless guardian.can_close_topic_as_op?(topic)
        TopicOpUserAdminBot.botLogger(
          "@#{guardian.user.username} 试图在未经授权的情况下" + (enabled ? "关闭" : "打开") + "话题 #{topic.url}",
        )
        return render_fail "topic_op_admin.no_perm", status: 403
      end
      TopicOpUserAdminBot.botLogger(
        "@#{guardian.user.username} " + (enabled ? "关闭" : "打开") + "话题 #{topic.url}",
      )
      # TopicOpUserAdminBot.botSendPost(topic.id, "@#{guardian.user.username} 应您所求， 我" + (enabled ? '关闭' : '打开') + "了该话题")
    when "visible"
      unless guardian.can_unlist_topic_as_op?(topic)
        TopicOpUserAdminBot.botLogger("@#{guardian.user.username} 试图在未经授权的情况下显示/隐藏话题 #{topic.url}")
        return render_fail "topic_op_admin.no_perm", status: 403
      end
      TopicOpUserAdminBot.botLogger(
        "@#{guardian.user.username} " + (enabled ? "显示" : "隐藏") + "话题 #{topic.url}",
      )
      # TopicOpUserAdminBot.botSendPost(topic.id, "@#{guardian.user.username} 应您所求， 我" + (enabled ? '显示' : '隐藏') + "了该话题")
    else
      TopicOpUserAdminBot.botLogger(
        "@#{guardian.user.username} 对 #{topic.url} 发送了未知请求，这是详细信息：\n```\n#{params.to_json}\n```",
      )
      return render_fail "topic_op_admin.no_perm", status: 403
    end

    topic.update_status(
      status,
      enabled,
      TopicOpUserAdminBot.getBot(),
      until: params[:until],
      message: "由楼主的要求操作",
    )

    render json:
             success_json.merge!(
               topic_status_update:
                 TopicTimerSerializer.new(TopicTimer.find_by(topic: topic), root: false),
             )
  end

  def update_slow_mode
    unless SiteSetting.topic_op_admin_enabled
      return render_fail "topic_op_admin.not_enabled", status: 405
    end

    params.require(:id)

    topic = Topic.find(params[:id])
    slow_mode_type = TopicTimer.types[:clear_slow_mode]
    timer = TopicTimer.find_by(topic: topic, status_type: slow_mode_type)

    guardian.ensure_can_see_topic!(topic)

    unless guardian.can_set_topic_slowmode_as_op?(topic)
      TopicOpUserAdminBot.botLogger("@#{guardian.user.username} 试图在未经授权的情况下对话题 #{topic.url} 设置慢速模式")
      return render_fail "topic_op_admin.no_perm", status: 403
    end

    topic.update!(slow_mode_seconds: params[:seconds])
    enabled = params[:seconds].to_i > 0

    time = enabled && params[:enabled_until].present? ? params[:enabled_until] : nil

    TopicOpUserAdminBot.botLogger(
      "@#{guardian.user.username} 对话题 #{topic.url} #{(enabled ? "设置了" : "禁用了")}慢速模式",
    )
    # TopicOpUserAdminBot.botSendPost(topic.id, "@#{guardian.user.username} 应您所求， 我在该话题#{(enabled ? '设置了' : '禁用了')}慢速模式")

    topic.set_or_create_timer(slow_mode_type, time, by_user: timer&.user)

    head :ok
  end

  def set_topic_op_admin_status
    unless SiteSetting.topic_op_admin_enabled
      return render_fail "topic_op_admin.not_enabled", status: 405
    end

    params.require(:id)
    params.require(:new_status)

    topic = Topic.find(params[:id])

    unless guardian.can_manipulate_topic_op_adminable?
      TopicOpUserAdminBot.botLogger(
        "@#{guardian.user.username} 在未经授权的情况下试图修订话题 #{topic.url} 楼主管理模式：\n```\n#{params.to_json}\n```",
      )
      return render_fail "topic_op_admin.no_perm", status: 403
    end

    ns = {
      can_close: params[:new_status]["close"],
      can_archive: params[:new_status]["archive"],
      can_make_PM: params[:new_status]["make_PM"],
      can_visible: params[:new_status]["visible"],
      can_slow_mode: params[:new_status]["slow_mode"],
      can_set_timer: params[:new_status]["set_timer"],
      can_silence: params[:new_status]["silence"],
      can_fold_posts: params[:new_status]["fold_posts"],
    }
    TopicOpAdminStatus.updateRecord(params[:id], **ns)

    TopicOpUserAdminBot.botLogger(
      "@#{guardian.user.username} 修订话题 #{topic.url} 楼主管理模式：\n```\n#{params.to_json}\n```",
    )

    render json: success_json.merge!(topic_op_admin_status_update: params[:new_status])
  end

  def request_for_topic_op_admin
    # TODO: request_for_topic_op_admin private message
    unless SiteSetting.topic_op_admin_enabled
      return render_fail "topic_op_admin.not_enabled", status: 405
    end

    params.require(:id)
    params.require(:raw)

    topic = Topic.find(params[:id])

    TopicOpUserAdminBot.botLogger(
      "@#{guardian.user.username} 申请将话题 #{topic.url} 设为楼主管理模式：\n[quote=\"#{guardian.user.username}\"]\n#{params[:raw]}\n[/quote]",
    )

    render json: success_json.merge!(message: I18n.t("topic_op_admin.get_request"))
  end

  def render_fail(*args, **kwargs)
    response.status = kwargs[:status] || 400
    render json: { success: false, message: I18n.t(*args, **kwargs.except(:status)) }
    nil
  end
end
