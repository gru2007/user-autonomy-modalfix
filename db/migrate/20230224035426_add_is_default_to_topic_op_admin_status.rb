# frozen_string_literal: true

class AddIsDefaultToTopicOpAdminStatus < ActiveRecord::Migration[7.0]
  def change
    add_column :topic_op_admin_status, :is_default, :boolean, null: false, default: true
  end
end
