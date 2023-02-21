# frozen_string_literal: true

module TopicOpUserAdminBot
  def TopicOpUserAdminBot.create_bot(id, admin: false, username: nil)
    User.new.tap do |user|
      bot.username_lower = bot.username.downcase
      bot.active = true
      bot.approved = true
      user.id = id
      user.email = "user#{SecureRandom.hex}@localhost#{SecureRandom.hex}.fake"
      user.username = username || "user#{SecureRandom.hex}"
      user.password = SecureRandom.hex
      user.save!
      if admin
        user.grant_admin!
      end
      user.change_trust_level!(TrustLevel[4])
      user.activate
    end
  end

  def TopicOpUserAdminBot.getBot()
    bot = User.find_by(id: SiteSetting.topic_op_admin_bot_user_id?)
    unless bot
      bot = create_bot(SiteSetting.topic_op_admin_bot_user_id?, admin: false, username: "UserAssistantBot")
    end
    bot
  end

  def TopicOpUserAdminBot.botLogger(rawText)
    PostCreator.create!(
      getBot(),
      skip_validations: true,
      topic_id: SiteSetting.topic_op_admin_logger_topic?,
      raw: rawText,
      import_mode: true,
      guardian: Guardian.new(Discourse.system_user)
    ) if SiteSetting.topic_op_admin_enable_topic_log?
  end

  def TopicOpUserAdminBot.botSendPost(topic_id, rawText)
    PostCreator.create!(
      getBot(),
      skip_validations: true,
      topic_id: topic_id,
      raw: rawText,
      import_mode: true,
      guardian: Guardian.new(Discourse.system_user)
    )
  end
end
