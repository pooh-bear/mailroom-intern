import { useState, useEffect, useRef } from 'react';
import { Login } from '@microsoft/mgt-react';
import { Providers, ProviderState } from '@microsoft/mgt-element';
import { Disclosure, Dialog } from '@headlessui/react';
import Editor, { MonacoDiffEditor } from '@monaco-editor/react';
import { SyncLoader } from 'react-spinners';


import './App.css';


const UserIsSignedIn = (): [boolean] => {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const updateState = () => {
      const provider = Providers.globalProvider;
      setIsSignedIn(provider && provider.state === ProviderState.SignedIn);
    };

    Providers.onProviderUpdated(updateState);
    updateState();

    return () => {
      Providers.removeProviderUpdatedListener(updateState);
    }
  }, []);

  return [isSignedIn];
}

const App = () => {
  const [signedIn] = UserIsSignedIn();
  const [selectedRule, setSelectedRule] = useState('');

  const unselectRule = () => {
    setSelectedRule('');
  }

  return (
    <div className='m-auto md:w-10/12'>
      <Header logoClick={unselectRule} />
      <Body signedIn={signedIn} selectedRule={selectedRule} setSelectedRule={setSelectedRule} />
    </div>
  );
}

type HeaderProps = {
  logoClick: any
}
const Header = ({ logoClick }: HeaderProps) => {
  return (
    <>
      <header className='md:grid md:grid-cols-2 md:m-4'>
        <div className='flex items-center'>
          <h1 className='text-xl font-bold inline-block align-baseline cursor-pointer text-indigo-800 mx-6 my-2 md:mx-0 md:my-0' onClick={logoClick}>
            MailroomIntern
          </h1>
        </div>
        <div className='flex md:justify-end'>
          <Login />
        </div>
      </header>
    </>
  );
}

type MainProps = {
  signedIn: boolean,
  selectedRule: any,
  setSelectedRule: any
}
const Body = ({ signedIn, selectedRule, setSelectedRule }: MainProps) => {

  return (
    <div className='m-4'>
      {signedIn &&
        <Main selectedRule={selectedRule} setSelectedRule={setSelectedRule} />
      }
      {!signedIn &&
        <div className="w-1/2 p-4 mx-auto text-center">
          <h1 className="font-bold text-2xl m-2">
            Not logged in
          </h1>
          <p className="m-2">
            Please log in to your Microsoft 365 account to
            use this application.
          </p>
          <Login />
        </div>
      }
    </div>
  )
}

const Main = (props: any) => {

  const newSelection = (selection: any) => {
    props.setSelectedRule(selection);
  }

  return (
    <>
      {props.selectedRule &&
        <div>
          <MailboxRule ruleId={props.selectedRule} />
        </div>
      }
      {!props.selectedRule &&
        <MailboxRulesList newSelection={newSelection} />
      }
    </>
  )
}

const MailboxRulesList = (props: any) => {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);

  const select = (event: any) => {
    props.newSelection(String(event.currentTarget.getAttribute('data-rule-id')));
  }

  useEffect(() => {
    const getMailboxRules = async () => {
      try {
        const response = await Providers.globalProvider.graph.client.api('/me/mailFolders/inbox/messageRules').get();
        setRules(response.value);
      } catch (error) {
        console.error('Error retrieving mailbox rules', error);
      }
      setLoading(false);
    };

    getMailboxRules();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Mailbox Rules</h2>
      {loading &&
        <div>Loading...</div>
      }
      {
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rules.map((rule: any) => (
            <div
              key={rule.id}
              className="border rounded p-2 my-1 grid grid-cols-2 cursor-pointer"
              data-rule-id={rule.id}
              onClick={(event) => select(event)}
            >
              <div className="font-bold">
                {rule.displayName}
              </div>
              <div className="flex justify-end">
                <span className="bg-slate-800 text-white text-sm font-semibold px-3 py-1 rounded">
                  {rule.conditions && rule.conditions.senderContains ?
                    rule.conditions.senderContains.length : 0
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
};

const MailboxRule = (props: any) => {
  const [ruleLoading, setRuleLoading] = useState(true);
  const [rulesFetched, setRulesFetched] = useState(false);
  const [rule, setRule] = useState({ displayName: null });
  const [currentEmailArr, setCurrentEmailArr] = useState<string[]>([]);
  const [jsonSaving, setJsonSaving] = useState(false);
  const [error, setError] = useState('');

  const editorRef = useRef(null);

  useEffect(() => {
    const getMailboxRule = async () => {
      try {
        if (rulesFetched) {
          return;
        }

        const response = await Providers.globalProvider.graph.client.api(`/me/mailFolders/inbox/messageRules/${props.ruleId}`).get();
        setRule(response);
        setRuleLoading(false);
        if (response.conditions.senderContains) {
          setCurrentEmailArr(response.conditions.senderContains);
        }
        setRulesFetched(true);
      } catch (error) {
        console.error('Error retrieving mailbox rule', error);
      }
    }

    getMailboxRule();
  });

  const updateEmailArr = async (original: string, updated: string) => {
    let updatedArr = currentEmailArr.map((item: string) => {
      if (item === original) {
        return updated.toUpperCase();
      } else {
        return item;
      }
    });
    updatedArr.sort();
    await Providers.globalProvider.graph.client.api(`/me/mailFolders/inbox/messageRules/${props.ruleId}`).patch({
      conditions: {
        senderContains: updatedArr
      }
    }).catch((error) => {
      console.error('Error updating mailbox rule', error);
    });
    setCurrentEmailArr(updatedArr);

  }

  const addNewEmail = async (email: string) => {
    let updatedArr = [...currentEmailArr];
    if (updatedArr.indexOf(email.toUpperCase()) === -1) {
      updatedArr.push(email.toUpperCase());
      updatedArr.sort();
      await Providers.globalProvider.graph.client.api(`/me/mailFolders/inbox/messageRules/${props.ruleId}`).patch({
        conditions: {
          senderContains: updatedArr
        }
      }).catch((error) => {
        console.error('Error updating mailbox rule', error);
      });
      setCurrentEmailArr(updatedArr);
    }
  }

  const deleteEmail = async (email: string) => {
    let updatedArr = currentEmailArr.filter((item: string) => item !== email);
    await Providers.globalProvider.graph.client.api(`/me/mailFolders/inbox/messageRules/${props.ruleId}`).patch({
      conditions: {
        senderContains: updatedArr
      }
    }).catch((error) => {
      console.error('Error updating mailbox rule', error);
    });
    setCurrentEmailArr(updatedArr);
  }

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
  }

  const jsonValidateAndSave = async () => {
    const editor: MonacoDiffEditor = editorRef.current;
    const value = editor.getValue();
    setJsonSaving(true);
    setError('');

    try {
      const parsed = JSON.parse(value.toUpperCase());
      if (parsed && Array.isArray(parsed)) {
        await new Promise((resolve) => setTimeout(() => {
          setCurrentEmailArr(parsed);
          setJsonSaving(false);
          resolve(true);
        }, 1000));
      } else {
        throw Error('JSON is not an array');
      }
    } catch (error) {
      setError('Invalid JSON: ' + error);
      console.error('Error parsing JSON input. Not saving. \n', error);
    }
  }

  useEffect(() => {
    const editor: MonacoDiffEditor = editorRef.current;
    if (editor) {
      editor.setValue(JSON.stringify(currentEmailArr, null, 2));
    }
  }, [currentEmailArr])

  return (
    <div>
      {ruleLoading &&
        <div>Loading...</div>
      }
      {!ruleLoading &&
        <div>
          <h2 className="text-2xl font-bold">Rules for {rule.displayName}</h2>
          <Disclosure>
            <Disclosure.Button className="px-3 py-1 text-white rounded bg-slate-800 font-semibold text-xs">
              Edit JSON
            </Disclosure.Button>
            <Disclosure.Panel>
              <div className="py-2">
                {error &&
                  <div className="bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded">
                    {error}
                  </div>
                }
              </div>
              <div className="border border-slate-300 rounded">
                <div className="m-1">
                  <Editor
                    height="40vh"
                    defaultLanguage='json'
                    defaultValue={JSON.stringify(currentEmailArr, null, 2)}
                    onMount={handleEditorDidMount}
                  />
                </div>
                <div className="p-2 flex">
                  <button
                    className={(jsonSaving ? "bg-slate-300"
                      : "bg-green-600 cursor-pointer"
                    ) + " text-white text-sm font-semibold px-3 py-1 rounded"
                    }
                    onClick={jsonValidateAndSave}
                    disabled={jsonSaving}
                  >
                    Save
                  </button>
                  {jsonSaving &&
                    <SyncLoader size="6px" className="mx-2" />
                  }
                </div>
              </div>
            </Disclosure.Panel>
          </Disclosure>

          <div className="my-4">
            <NewRuleItem add={addNewEmail} />
            {currentEmailArr.map((item: string, idx: number) => {
              return (
                <RuleItem key={`ruleItem-${idx}`} item={item} update={updateEmailArr} delete={deleteEmail} />
              )
            })}
          </div>
        </div>
      }
    </div>
  )
}

const NewRuleItem = (props: any) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    try {
      await props.add(value);
      setValue('');
    } catch {
      // do nothing for now
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border rounded p-2 my-1 flex">
      <input
        className="border-b grow"
        placeholder={"add a new email / domain"}
        onChange={(event) => setValue(event.target.value)}
        value={value}
        disabled={saving}
      />
      <span>
        <button
          className={(saving || value === '' ? "bg-slate-300" : "bg-green-600 hover:cursor-pointer") + (" text-white text-sm font-semibold px-3 py-1 ml-4 rounded")}
          onClick={add}
          disabled={saving || value === ''}
        >
          add
        </button>
      </span>
    </div>
  )
}

const RuleItem = (props: any) => {
  const [editMode, setEditMode] = useState(false);
  const [itemSaving, setItemSaving] = useState(false);
  const [currentValue, setCurrentValue] = useState(props.item.toLowerCase());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const saveItem = async () => {
    setItemSaving(true);
    try {
      await props.update(props.item, currentValue);
    } catch {
      // do nothing for now
    } finally {
      setItemSaving(false);
      setEditMode(false);
    }
  }

  const deleteItem = async () => {
    setItemSaving(true);
    try {
      setDeleteModalOpen(false);
      await props.delete(props.item);
    } catch {
      // do nothing for now
    } finally {
      setItemSaving(false);
      setEditMode(false);
    }
  }

  return (
    <div>
      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-white bg-opacity-80">
          <Dialog.Panel className="bg-slate-800 p-4 rounded-lg text-white md:max-w-sm">
            <Dialog.Title className="text-lg font-bold">
              Confirm deletion
            </Dialog.Title>
            <Dialog.Description>
              Are you sure you want to delete
              <span className="font-bold px-1">
                {props.item.toLowerCase()}
              </span>?
              <br />
              You won't be able to undo this action.
            </Dialog.Description>
            <div className="flex justify-end mt-4">
              <button
                className="bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded"
                onClick={() => deleteItem()}
              >
                Confirm
              </button>
              <button
                className="bg-slate-600 text-white text-sm font-semibold px-3 py-1 rounded ml-2"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
      <div className="border rounded p-2 my-1 flex justify-between">
        <div className="w-full md:w-full mr-auto">
          {editMode &&
            <div className="md:flex space-between justify-end">
              <input
                type="text"
                className="rounded p-1 grow border-b w-96 mb-2"
                disabled={itemSaving}
                onChange={(event) => setCurrentValue(event.target.value)}
                value={currentValue}
              />
              {itemSaving &&
                <SyncLoader size="6px" className="mx-2" />
              }
              <div className="flex md:justify-end md:-mr-6">
                <button
                  className={
                    ((itemSaving || currentValue.toUpperCase() === String(props.item) || currentValue === '' ? "bg-slate-300"
                      : "bg-green-600 cursor-pointer")
                      + " text-white text-sm font-semibold px-3 py-1 ml-4 rounded grow")
                  }
                  onClick={() => saveItem()}
                  disabled={itemSaving || currentValue.toUpperCase() === String(props.item) || currentValue === ''}
                >
                  save
                </button>
                <button
                  className={
                    ((itemSaving ? "bg-slate-300"
                      : "bg-slate-600") +
                      " text-white text-sm font-semibold px-3 py-1 mx-2 rounded cursor-pointer grow")
                  }
                  onClick={!itemSaving ? () => setEditMode(false) : () => { }}
                >
                  cancel
                </button>
              </div>
            </div>
          }
          {!editMode &&
            <p
              className="cursor-pointer hover:underline inline-block overflow-hidden truncate w-64 md:w-full"
              onClick={() => setEditMode(true)}
            >
              {String(props.item).toLowerCase()}
            </p>
          }
        </div>
        <div className="flex justify-end ml-4">
          {(itemSaving && !editMode) &&
            <SyncLoader size="6px" className="mx-2" />
          }
          <button
            className={
              ((itemSaving
                ? "bg-slate-300"
                : "bg-red-600 cursor-pointer")
                + (" text-white text-sm font-semibold px-3 py-1 rounded")
                + (editMode ? ' hidden md:visible' : ''))}
            onClick={() => setDeleteModalOpen(true)}
          >
            delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
