import { useMemo, useState } from 'react';
import { Button, ColorPicker, Input, Select, Space, Tag, Tooltip, message } from 'antd';
import { PlusOutlined, TagsOutlined } from '@ant-design/icons';
import {
  useGetTagsQuery,
  useCreateTagMutation,
  useGetCasinoTagsQuery,
  useSetCasinoTagsMutation,
  type Tag as TagType,
} from '../../../store/api/tagApi';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CasinoTagsProps {
  casinoId: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CasinoTags({ casinoId }: CasinoTagsProps) {
  const { data: allTags = [] } = useGetTagsQuery();
  const { data: casinoTags = [] } = useGetCasinoTagsQuery(casinoId);
  const [createTag] = useCreateTagMutation();
  const [setCasinoTags] = useSetCasinoTagsMutation();

  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#1677ff');

  const casinoTagIds = useMemo(() => casinoTags.map((t) => t.id), [casinoTags]);

  // Options for the Select (tags not yet assigned)
  const tagOptions = useMemo(
    () =>
      allTags.map((t) => ({
        value: t.id,
        label: t.name,
        tag: t,
      })),
    [allTags],
  );

  const handleTagChange = async (selectedIds: number[]) => {
    try {
      await setCasinoTags({ casinoId, tagIds: selectedIds }).unwrap();
    } catch {
      message.error('Не удалось обновить теги');
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tag = await createTag({ name: newTagName.trim(), color: newTagColor }).unwrap();
      setNewTagName('');
      setCreating(false);
      // Also assign to this casino immediately
      await setCasinoTags({ casinoId, tagIds: [...casinoTagIds, tag.id] }).unwrap();
      message.success(`Тег «${tag.name}» создан и добавлен`);
    } catch (e: any) {
      message.error(e?.data?.error ?? 'Ошибка создания тега');
    }
  };

  return (
    <Space wrap size={8} style={{ marginBottom: 4 }}>
      <Tooltip title="Теги">
        <TagsOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
      </Tooltip>

      {/* Currently assigned tags */}
      {casinoTags.map((tag) => (
        <Tag
          key={tag.id}
          color={tag.color}
          closable
          onClose={() => {
            const newIds = casinoTagIds.filter((id) => id !== tag.id);
            handleTagChange(newIds);
          }}
        >
          {tag.name}
        </Tag>
      ))}

      {/* Add existing tag */}
      <Select
        mode="multiple"
        value={casinoTagIds}
        onChange={handleTagChange}
        options={tagOptions}
        style={{ minWidth: 160 }}
        size="small"
        placeholder="+ Тег"
        maxTagCount={0}
        maxTagPlaceholder={`+ Добавить тег`}
        optionRender={(option) => {
          const tag = (option.data as any).tag as TagType;
          return (
            <Space>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: tag.color,
                }}
              />
              {tag.name}
            </Space>
          );
        }}
      />

      {/* Create new tag */}
      {creating ? (
        <Space size={4}>
          <Input
            size="small"
            placeholder="Имя тега"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onPressEnter={handleCreateTag}
            style={{ width: 120 }}
            autoFocus
          />
          <ColorPicker
            size="small"
            value={newTagColor}
            onChange={(_, hex) => setNewTagColor(hex)}
          />
          <Button size="small" type="primary" onClick={handleCreateTag}>
            OK
          </Button>
          <Button size="small" onClick={() => setCreating(false)}>
            ✕
          </Button>
        </Space>
      ) : (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setCreating(true)}
        >
          Новый тег
        </Button>
      )}
    </Space>
  );
}
