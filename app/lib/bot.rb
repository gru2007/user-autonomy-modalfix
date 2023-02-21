# frozen_string_literal: true

module TopicOpUserAdminBot
  def TopicOpUserAdminBot.create_bot(id, admin: false, username: nil)
    User.new.tap do |user|
      user.id = id
      user.email = "user#{SecureRandom.hex}@localhost#{SecureRandom.hex}.fake"
      user.username = username || "user#{SecureRandom.hex}"
      user.password = SecureRandom.hex
      user.username_lower = user.username.downcase
      user.active = true
      user.approved = true
      user.save!
      user.grant_admin! if admin
      user.change_trust_level!(TrustLevel[4])
      user.activate
    end
  end

  def TopicOpUserAdminBot.getBot()
    User.find_by(id: SiteSetting.topic_op_admin_bot_user_id?) ||
      create_bot(
        SiteSetting.topic_op_admin_bot_user_id?,
        admin: false,
        username: "UserAssistantBot",
      )
  end

  def TopicOpUserAdminBot.botLogger(rawText)
    if SiteSetting.topic_op_admin_enable_topic_log?
      PostCreator.create!(
        getBot,
        skip_validations: true,
        topic_id: SiteSetting.topic_op_admin_logger_topic?,
        raw: rawText,
        guardian: Guardian.new(Discourse.system_user),
      )
    end
  end

  def TopicOpUserAdminBot.botSendPost(topic_id, rawText)
    PostCreator.create!(
      getBot,
      skip_validations: true,
      topic_id: topic_id,
      raw: rawText,
      guardian: Guardian.new(Discourse.system_user),
    )
  end
end
