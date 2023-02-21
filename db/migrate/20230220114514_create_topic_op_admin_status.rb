# frozen_string_literal: true

class CreateTopicOpAdminStatus < ActiveRecord::Migration[7.0]
  def change
    create_table :topic_op_admin_status do |t|
      t.boolean :can_close, null: true, default: false
      t.boolean :can_archive, null: true, default: false
      t.boolean :can_make_PM, null: true, default: false
      t.boolean :can_visible, null: true, default: false
      t.boolean :can_slow_mode, null: true, default: false
      t.boolean :can_set_timer, null: true, default: false
      t.boolean :can_silence, null: true, default: false
      t.boolean :can_fold_posts, null: true, default: false
    end
  end
end
