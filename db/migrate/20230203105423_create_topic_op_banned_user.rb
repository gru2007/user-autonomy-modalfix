# frozen_string_literal: true

class CreateTopicOpBannedUser < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_op_banned_user do |t|
      t.integer :topic_id
      t.integer :user_id
      t.datetime :banned_at, null: false
      t.integer :banned_seconds, null: true
    end
  end
end
