import { useState } from 'react';
import { DocumentService } from '../api/domains';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell
} from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { ArrowLeft, Search, Loader2, FileText } from 'lucide-react';

const DocList = () => {
    const [doctype, setDoctype] = useState('User');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLoad = async () => {
        if (!doctype) return;
        setLoading(true);
        setError(null);
        setData([]);
        try {
            const result = await DocumentService.getList(doctype, { limit: 20 });
            setData(result.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch documents. Check Doctype name or permissions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Document List</h1>
                </div>
            </div>

            {/* Controls */}
            <Card className="p-4">
                <div className="flex items-end gap-4 max-w-lg">
                    <div className="flex-1">
                        <Input
                            label="Doctype"
                            placeholder="e.g. User, ToDo"
                            value={doctype}
                            onChange={(e) => setDoctype(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                        />
                    </div>
                    <Button onClick={handleLoad} disabled={loading} className="mb-[2px]">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        Load
                    </Button>
                </div>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </Card>

            {/* Results */}
            <Card>
                {data.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Name</TableHead>
                                <TableHead>Data Preview</TableHead>
                                <TableHead className="w-[100px] text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((doc) => (
                                <TableRow key={doc.name} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/form/${doctype}/${doc.name}`)}>
                                    <TableCell className="font-medium text-primary">
                                        {doc.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground font-mono truncate max-w-md">
                                            {JSON.stringify(doc)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/form/${doctype}/${doc.name}`);
                                        }}>
                                            <FileText className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="p-12 text-center text-muted-foreground">
                        <div className="flex justify-center mb-3">
                            <FileText className="w-10 h-10 opacity-20" />
                        </div>
                        <p>{loading ? 'Loading...' : 'No documents found. Enter a Doctype and click Load.'}</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DocList;
